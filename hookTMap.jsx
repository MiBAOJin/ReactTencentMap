import { closeSpin, msg, openSpin } from 'common/methods';
import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import styled from 'styled-components';
/**
 * position                     Object对象, {lat,lng}传入经纬度. 不传默认为成都
 * closeGetLocation             是否关闭定位,默认为false
 * searchCity                   设置地址搜索指定城市,默认为成都
 * moreHeight                   当前容器内(div)需要减去的高度
 * ok                           当用户选择完成之后调用的方法
 * cancel                       用户点击取消时调用的方法
 * current中可调用的方法:{
 *  search(String:keyword)      根据传入的关键字进行地址解析,并搜索出地址信息
 *  getLocation()               获取用户选择的经纬度
 *  searchNear(Int:lat,Int:lng) 传入经纬度搜索地理位置并查询出周边
 * }
 * ps:使用地图组件需要控制父组件的刷新次数,否则会导致地图多次重复加载
 * 使用前需要先引用腾讯地图的三个js文件
 * 
 * <script src="https://map.qq.com/api/gljs?v=1.exp&key=yourKey"></script>
 * <script src='https://mapapi.qq.com/web/mapComponents/geoLocation/v/geolocation.min.js'></script>
 * <script charset="utf-8" src="https://map.qq.com/api/js?v=2.exp&key=yourKey"></script>
 */
let centerCache;
function Map(props, ref) {
    let MapBlock = styled.div`
        width:100%;
        height:${'calc(100% - ' + (props.moreHeight || 0) + 'px)'};
        position:relative;
        .map{
            height:100%;
            width:100%;
        }
        .searchResult{
            position:absolute;
            height:40%;
            bottom:0;
            width:100%;
            background-color:#ffffff;
            z-index: 1001;
        }
        .ex{
            text-align:center;
            padding:4px 0px;
            color:#666666;
            border-bottom:1px solid #ededed;
            font-size:12px;
        }
        .searchContet{
            overflow-y: scroll;
            height: calc(100% - 40px);
        }
        .search_item{
            padding:20px 10px;
            border-bottom: 1px solid #ededed;
            overflow: hidden;
            text-overflow:ellipsis;
            white-space: nowrap;
        }
        .choose_search_item{
            color:#108ee9;
        }
        .none_search{
            text-align:center;
            margin-top:20px;
        }
        .searchInfo{
            display:flex;
            justify-content:space-between;
            height:40px;
            line-height:40px;
            align-items:center;
            border-bottom:1px solid #ededed;
        }
        .f16{
            font-size:16px;
        }
        .searchBtn{
            width:60px;
            text-align:center;
        }
    `;
    let searchContentRef = useRef(), mapDom, key = 'KM6BZ-VGQRS-4YJOX-6CBJA-LOPF2-CCBUA';
    let map,//地图服务
        markerLayer,//标注服务
        geolocation,//定位服务
        searchService,//搜索服务
        geocoder//逆地址解析服务
    useEffect(() => {
        initMap(props.position?.lat, props.position?.lng);
        return () => {
            centerCache = null;
            map.destroy();
        }
    }, [props])
    //设置ref引用
    useImperativeHandle(ref, () => ({
        //地址解析,并搜索出地址信息
        search: (address) => {
            //需要处理的数据
            searchPositionByAddressName(address);
        },
        //获取用户选择的地理位置
        getLocation: () => {
            return getPosition();
        },
        //传入经纬度跳转到附近并搜索出周边信息
        searchNear: (tarLat, tarLng) => {
            searchNearBy(tarLat, tarLng);
        }
    }))
    //地图初始化函数，本例取名为init，开发者可根据实际情况定义
    function initMap(lat, lng, cb) {
        //设置中心坐标
        let tarLat = lat || 30.663463;
        let tarLng = lng || 104.072242;
        //定义地图中心点坐标
        let center = centerCache || new TMap.LatLng(tarLat, tarLng);
        //定义map变量，调用 TMap.Map() 构造函数创建地图
        map = new TMap.Map(mapDom, {
            center: center,//设置地图中心点坐标
            zoom: 17,   //设置地图缩放级别
            pitch: 20,  //设置俯仰角
            // rotation: 45    //设置地图旋转角度
        });
        initMacker(center);//初始化标注
        initSearchService();//初始化搜索服务
        // map.setPitchable(false);//关闭地图改变俯仰角度
        // map.setRotatable(false);//关闭地图旋转
        listenerFunc();//初始化监听事件 用于监听地图边界值
        if (!centerCache && !props.position?.lat) getUserPosition();//获取用户定位
        searchNearBy(tarLat, tarLng);
        //监听地图平移结束
        map.on("click", function (evt) {
            let latlng = {};
            latlng.lat = evt.latLng.getLat().toFixed(6);
            latlng.lng = evt.latLng.getLng().toFixed(6);
            cacheMapConfig(latlng.lat, latlng.lng);
            searchNearBy(latlng.lat, latlng.lng);
        })
        centerCache = cacheMapConfig(tarLat, tarLng);//把最新的centerCache赋值进去
        if (cb) cb();
    }
    //根据标注获取当前坐标
    function getPosition() {
        return searchContentRef?.current?.getSearchInfo();
    }
    //地址解析,城市默认设置为仅允许搜索成都
    function searchPositionByAddressName(keyword) {
        searchService.search(keyword);
    }
    //根据经纬度获取周边
    function searchNearBy(lat, lng) {
        // geocoder.getLocation(new qq.maps.LatLng(lat, lng));
        geocoder.getAddress(new qq.maps.LatLng(lat, lng));
    }
    function initSearchService() {
        geocoder = new window.qq.maps.Geocoder({
            complete: results => {
                let data = results.detail, latlng = data.location;
                let pois = [{ address: data.address, latLng: latlng, id: -100 }];
                if (setMapCenter) setMapCenter(latlng.lat, latlng.lng);
                if (setMarkerPosition) setMarkerPosition(latlng.lat, latlng.lng);
                searchContentRef?.current?.setResult([...pois, ...data.nearPois]);
                searchContentRef?.current?.setDefault(pois[0].id);
                searchContentRef?.current?.setSearchInfo(pois[0]);
            },
        })
        searchService = new qq.maps.SearchService({
            location: props?.searchCity || '成都',
            complete: results => {
                let pois = results?.detail?.pois;
                if (pois) {
                    let latlng = pois[0].latLng;
                    if (setMapCenter) setMapCenter(latlng.lat, latlng.lng);
                    if (setMarkerPosition) setMarkerPosition(latlng.lat, latlng.lng);
                    searchContentRef?.current?.setResult(pois);
                    searchContentRef?.current?.setDefault(pois[0].id);
                    searchContentRef?.current?.setSearchInfo(pois[0]);
                }
                // if (pois) setConfig(Object.assign({}, config, { searchSourch: pois }));
            },
        });
    }
    //获取用户定位
    function getUserPosition() {
        geolocation = new qq.maps.Geolocation(key, "xiangong");
        openSpin('定位中...');
        //判断是否开启定位
        if (!props.closeGetLocation) {
            geolocation.getLocation((position) => {
                closeSpin();
                msg('success', '定位成功,跳转到当前位置');
                setMarkerPosition(position?.lat, position?.lng);
                setMapCenter(position?.lat, position?.lng);
                searchNearBy(position?.lat, position?.lng);
            }, (err) => {
                closeSpin();
                msg('warning', '定位失败,请检查GPS是否打开');
            }, { timeout: 5000, failTipFlag: true });
        }
    }
    //修改地图中心点
    function setMapCenter(lat, lng) {
        // map.setCenter(new TMap.LatLng(lat, lng));//非平滑移动
        cacheMapConfig(lat, lng);
        map.panTo(new TMap.LatLng(lat, lng));//平滑移动
    }
    //缓存地图配置  lat  lng;
    function cacheMapConfig(lat, lng) {
        centerCache = new TMap.LatLng(lat, lng);
    }
    function setMarkerPosition(lat, lng) {
        markerLayer.updateGeometries([{
            "styleId": "myStyle",
            "id": "1",
            "position": new TMap.LatLng(lat, lng),
        }])
    }
    //初始化标记
    function initMacker(center) {
        //创建并初始化MultiMarker
        markerLayer = new TMap.MultiMarker({
            map: map,  //指定地图容器
            //样式定义
            styles: {
                //创建一个styleId为"myStyle"的样式（styles的子属性名即为styleId）
                "myStyle": new TMap.MarkerStyle({
                    "width": 25,  // 点标记样式宽度（像素）
                    "height": 35, // 点标记样式高度（像素）
                    //焦点在图片中的像素位置，一般大头针类似形式的图片以针尖位置做为焦点，圆形点以圆心位置为焦点
                    "anchor": { x: 16, y: 32 }
                })
            },
            //点标记数据数组
            geometries: [{
                "id": "1",   //点标记唯一标识，后续如果有删除、修改位置等操作，都需要此id
                "styleId": 'myStyle',  //指定样式id
                "position": center,  //点标记坐标位置
                "properties": {//自定义属性
                    "title": "marker1"
                }
            }]
        });
    }
    //事件监听方法
    function listenerFunc() {
        //设置地图边界值
        let sw = new TMap.LatLng(30.020977, 103.350076);
        let ne = new TMap.LatLng(31.052148, 105.668136);
        let boundary = new TMap.LatLngBounds(sw, ne);
        mapDom.addEventListener('click', () => {
            map.setBoundary(boundary);
        }, false);
        mapDom.addEventListener('touchmove', () => {
            map.setBoundary(boundary);
        }, false);
    }
    return <MapBlock style={{ height: props.moreHeight ? 'calc(100% - ' + props.moreHeight + ')' : '100%' }}>
        <div className='map' ref={el => { mapDom = el }}></div>
        <SearchContent
            ref={searchContentRef}
            ok={props.ok}
            cancel={props.cancel}
            setMapCenter={setMapCenter}
            setMarkerPosition={setMarkerPosition}
        />
    </MapBlock >
}
function SearchContent(props, ref) {
    let [searchSourch, setSearchSourch] = useState([]);
    let [itemIndex, setItemIndex] = useState(null);
    let [searchInfo, setSearchInfo] = useState(null);
    //设置ref引用
    useImperativeHandle(ref, () => ({
        setResult: (address) => {
            setSearchSourch(address);
        },
        setDefault: (index) => {
            setItemIndex(index);
        },
        getSearchInfo: () => {
            return searchInfo;
        },
        setSearchInfo: (result) => {
            setSearchInfo(result);
        }
    }))
    function chooseData(item) {
        let setMarkerPosition = props.setMarkerPosition,
            setMapCenter = props.setMapCenter,
            latlng = item.latLng;
        setItemIndex(item.id);
        setSearchInfo(item);
        if (setMapCenter) setMapCenter(latlng.lat, latlng.lng);
        if (setMarkerPosition) setMarkerPosition(latlng.lat, latlng.lng);
    }
    function ok() {
        if (props.ok) props.ok(searchInfo);
    }
    function cancel() {
        if (props.cancel) props.cancel();
    }
    return <div className='searchResult'>
        <div className='searchInfo'>
            <div className='searchBtn' onClick={cancel}>取消</div>
            <div className='f16'>请选择地址</div>
            <div className='searchBtn' onClick={ok}>确定</div>
        </div>
        <div className='searchContet'>
            {searchSourch && searchSourch.length > 0 ? searchSourch.map((item) => {
                return <div
                    className={itemIndex === item.id ? 'search_item choose_search_item' : 'search_item'}
                    onClick={() => {
                        chooseData(item);
                    }} key={item.id}>{item.address}{item.name ? '(' + item.name + ')' : null}</div>
            }) : <div className='none_search'>暂时没有搜索结果</div>}
        </div>
    </div>
}
Map = forwardRef(Map);
SearchContent = forwardRef(SearchContent);
export default Map;